package com.spendiq.trading.service;

import com.spendiq.trading.dto.OrderRequest;
import com.spendiq.trading.dto.OrderResponse;
import com.spendiq.trading.dto.PortfolioResponse;
import com.spendiq.trading.entity.AssetEntity;
import com.spendiq.trading.entity.OrderEntity;
import com.spendiq.trading.entity.PortfolioEntry;
import com.spendiq.trading.repository.AssetRepository;
import com.spendiq.trading.repository.OrderRepository;
import com.spendiq.trading.repository.PortfolioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class TradingService {

    private final OrderRepository     orderRepository;
    private final PortfolioRepository portfolioRepository;
    private final AssetRepository     assetRepository;

    public TradingService(OrderRepository orderRepository,
                          PortfolioRepository portfolioRepository,
                          AssetRepository assetRepository) {
        this.orderRepository     = orderRepository;
        this.portfolioRepository = portfolioRepository;
        this.assetRepository     = assetRepository;
    }

    // ─────────────────────────────────────────────────────────
    // CREAR ORDEN
    // ─────────────────────────────────────────────────────────
    @Transactional
    public OrderResponse createOrder(String userId, OrderRequest request) {

        AssetEntity asset = assetRepository.findById(request.getAsset())
                .orElseThrow(() -> new RuntimeException("Asset no encontrado: " + request.getAsset()));

        if (asset.getPriceUsd() == 0.0) {
            throw new RuntimeException("Precio de " + request.getAsset() + " aún no disponible");
        }

        // En VENTA comprobamos que el usuario tenga suficiente en cartera
        if (request.getTipo() == OrderEntity.Tipo.VENTA) {
            PortfolioEntry entry = portfolioRepository
                    .findByUserIdAndAsset(userId, request.getAsset())
                    .orElseThrow(() -> new RuntimeException(
                            "No tienes " + request.getAsset() + " en tu portfolio"));

            if (entry.getCantidad() < request.getCantidad()) {
                throw new RuntimeException("Cantidad insuficiente: tienes "
                        + entry.getCantidad() + " " + request.getAsset());
            }
        }

        OrderEntity order = new OrderEntity();
        order.setUserId(userId);
        order.setAsset(request.getAsset());
        order.setTipo(request.getTipo());
        order.setCantidad(request.getCantidad());
        order.setPrecioUnitario(asset.getPriceUsd());
        order.setTotal(request.getCantidad() * asset.getPriceUsd());
        order.setFecha(LocalDateTime.now());
        orderRepository.save(order);

        actualizarPortfolio(userId, request.getAsset(), request.getCantidad(), request.getTipo());

        return new OrderResponse(order);
    }

    // ─────────────────────────────────────────────────────────
    // HISTORIAL DE ÓRDENES
    // ─────────────────────────────────────────────────────────
    public List<OrderResponse> getOrders(String userId) {
        return orderRepository.findByUserIdOrderByFechaDesc(userId)
                .stream()
                .map(OrderResponse::new)
                .toList();
    }

    // ─────────────────────────────────────────────────────────
    // PORTFOLIO
    // ─────────────────────────────────────────────────────────
    public List<PortfolioResponse> getPortfolio(String userId) {
        return portfolioRepository.findByUserId(userId)
                .stream()
                .filter(e -> e.getCantidad() > 0)
                .map(e -> {
                    Double precio = assetRepository.findById(e.getAsset())
                            .map(AssetEntity::getPriceUsd)
                            .orElse(0.0);
                    return new PortfolioResponse(e, precio);
                })
                .toList();
    }

    // ─────────────────────────────────────────────────────────
    // ACTUALIZAR PORTFOLIO (privado)
    // ─────────────────────────────────────────────────────────
    private void actualizarPortfolio(String userId, String asset, Double cantidad, OrderEntity.Tipo tipo) {
        PortfolioEntry entry = portfolioRepository
                .findByUserIdAndAsset(userId, asset)
                .orElseGet(() -> {
                    PortfolioEntry e = new PortfolioEntry();
                    e.setUserId(userId);
                    e.setAsset(asset);
                    e.setCantidad(0.0);
                    return e;
                });

        double nueva = tipo == OrderEntity.Tipo.COMPRA
                ? entry.getCantidad() + cantidad
                : entry.getCantidad() - cantidad;

        entry.setCantidad(nueva);
        portfolioRepository.save(entry);
    }
}

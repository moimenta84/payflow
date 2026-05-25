package com.payflow.trading.service;

import com.payflow.trading.dto.OrderRequest;
import com.payflow.trading.dto.OrderResponse;
import com.payflow.trading.dto.PortfolioResponse;
import com.payflow.trading.entity.AssetEntity;
import com.payflow.trading.entity.OrderEntity;
import com.payflow.trading.entity.PortfolioEntry;
import com.payflow.trading.repository.AssetRepository;
import com.payflow.trading.repository.OrderRepository;
import com.payflow.trading.repository.PortfolioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class TradingService {

    private static final String USDT         = "USDT";
    private static final double USDT_INICIAL = 10_000.0;

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

        double precio   = asset.getPriceUsd();
        double cantidad = request.getCantidad();
        double total    = cantidad * precio;

        if (request.getTipo() == OrderEntity.Tipo.COMPRA) {
            // Get or initialize USDT wallet (10,000 on first operation)
            PortfolioEntry usdt = portfolioRepository
                    .findByUserIdAndAsset(userId, USDT)
                    .orElseGet(() -> crearEntrada(userId, USDT, USDT_INICIAL));

            if (usdt.getCantidad() < total) {
                throw new RuntimeException("Saldo USDT insuficiente. Tienes "
                        + String.format("%.2f", usdt.getCantidad()) + " USDT, necesitas "
                        + String.format("%.2f", total) + " USDT");
            }
            usdt.setCantidad(usdt.getCantidad() - total);
            portfolioRepository.save(usdt);

            PortfolioEntry crypto = portfolioRepository
                    .findByUserIdAndAsset(userId, request.getAsset())
                    .orElseGet(() -> crearEntrada(userId, request.getAsset(), 0.0));
            crypto.setCantidad(crypto.getCantidad() + cantidad);
            portfolioRepository.save(crypto);

        } else { // VENTA
            PortfolioEntry crypto = portfolioRepository
                    .findByUserIdAndAsset(userId, request.getAsset())
                    .orElseThrow(() -> new RuntimeException(
                            "No tienes " + request.getAsset() + " en tu portfolio"));

            if (crypto.getCantidad() < cantidad) {
                throw new RuntimeException("Cantidad insuficiente: tienes "
                        + crypto.getCantidad() + " " + request.getAsset());
            }
            crypto.setCantidad(crypto.getCantidad() - cantidad);
            portfolioRepository.save(crypto);

            PortfolioEntry usdt = portfolioRepository
                    .findByUserIdAndAsset(userId, USDT)
                    .orElseGet(() -> crearEntrada(userId, USDT, 0.0));
            usdt.setCantidad(usdt.getCantidad() + total);
            portfolioRepository.save(usdt);
        }

        OrderEntity order = new OrderEntity();
        order.setUserId(userId);
        order.setAsset(request.getAsset());
        order.setTipo(request.getTipo());
        order.setCantidad(cantidad);
        order.setPrecioUnitario(precio);
        order.setTotal(total);
        order.setFecha(LocalDateTime.now());
        orderRepository.save(order);

        return new OrderResponse(order);
    }

    private PortfolioEntry crearEntrada(String userId, String asset, double cantidad) {
        PortfolioEntry e = new PortfolioEntry();
        e.setUserId(userId);
        e.setAsset(asset);
        e.setCantidad(cantidad);
        return portfolioRepository.save(e);
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
                    Double precio = USDT.equals(e.getAsset())
                            ? 1.0
                            : assetRepository.findById(e.getAsset())
                                    .map(AssetEntity::getPriceUsd)
                                    .orElse(0.0);
                    return new PortfolioResponse(e, precio);
                })
                .toList();
    }
}

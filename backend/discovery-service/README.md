# Discovery Service

Servidor de registro y descubrimiento de servicios basado en **Netflix Eureka**.

## Responsabilidad

Actúa como el directorio central de la arquitectura de microservicios. Todos los demás servicios se registran aquí al arrancar, y el API Gateway los localiza dinámicamente mediante su nombre lógico (p. ej. `lb://auth-service`) sin necesidad de conocer su IP o puerto concreto.

## Puerto

| Servicio          | Puerto |
|-------------------|--------|
| discovery-service | 8761   |

## Panel de administración

Accesible en `http://localhost:8761` — muestra los servicios registrados y su estado.

## Tecnologías

- Spring Boot 3 + Spring Cloud Netflix Eureka Server
- Java 21

## Variables de configuración relevantes

| Propiedad                                | Valor por defecto |
|------------------------------------------|-------------------|
| `eureka.client.register-with-eureka`     | `false`           |
| `eureka.client.fetch-registry`           | `false`           |

> Este servicio no se registra a sí mismo en Eureka (es el servidor, no un cliente).

## Dependencias

No depende de ningún otro microservicio del proyecto. **Debe arrancarse el primero.**

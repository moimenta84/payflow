package com.payflow.invoicing.exception;

import org.springframework.http.HttpStatus;

/**
 * Excepción de negocio que lleva asociado su código HTTP. El GlobalExceptionHandler
 * la traduce a la respuesta con el status correcto (404, 403, 409, 400, 401...),
 * en lugar de devolver siempre 400. Usar las factorías estáticas en los servicios.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public static ApiException notFound(String message)     { return new ApiException(HttpStatus.NOT_FOUND, message); }
    public static ApiException badRequest(String message)   { return new ApiException(HttpStatus.BAD_REQUEST, message); }
    public static ApiException conflict(String message)     { return new ApiException(HttpStatus.CONFLICT, message); }
    public static ApiException forbidden(String message)    { return new ApiException(HttpStatus.FORBIDDEN, message); }
    public static ApiException unauthorized(String message) { return new ApiException(HttpStatus.UNAUTHORIZED, message); }
}

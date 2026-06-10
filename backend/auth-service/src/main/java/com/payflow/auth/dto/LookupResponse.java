package com.payflow.auth.dto;

// Respuesta mínima de la búsqueda por teléfono: solo lo necesario para enviar
// dinero (el userId) y confirmar el destinatario (su nombre). No expone email,
// saldo ni rol de otro usuario.
public class LookupResponse {

    private final String userId;
    private final String fullName;

    public LookupResponse(String userId, String fullName) {
        this.userId = userId;
        this.fullName = fullName;
    }

    public String getUserId()   { return userId; }
    public String getFullName() { return fullName; }
}

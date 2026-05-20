package com.payflow.auth.repository;

import com.payflow.auth.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

// JpaRepository<UserEntity, String> nos da gratis:
// save(), findById(), findAll(), deleteById(), count()...
// El segundo parámetro (String) es el tipo del @Id en UserEntity
public interface UserRepository extends JpaRepository<UserEntity, String> {

    // Spring Data lee el nombre del método y genera automáticamente:
    // SELECT * FROM users WHERE email = ?
    // Devuelve Optional para obligar a manejar el caso de usuario no encontrado
    Optional<UserEntity> findByEmail(String email);

    // Genera: SELECT COUNT(*) FROM users WHERE email = ?
    // Se usa en el registro para evitar emails duplicados
    boolean existsByEmail(String email);
}

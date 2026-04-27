// context/AuthContext.jsx
// VERSIÓN MEJORADA - Con Firestore para datos de usuario
import React, { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { auth, db, firebaseEnabled } from "../config/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

const AuthContext = createContext(null);

const MOCK_USER = {
  uid: "demo-user",
  email: "demo@spendiq.app",
  nombre: "Demo",
  apellido: "Usuario",
  telefono: "",
  avatar: "👤",
  saldoInicial: 0,
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(!firebaseEnabled ? MOCK_USER : null);
  const [loading, setLoading] = useState(firebaseEnabled);

  // Función para cargar datos del usuario desde Firestore
  const loadUserData = async (firebaseUser) => {
    try {
      console.log(
        "📥 Cargando datos del usuario desde Firestore:",
        firebaseUser.uid,
      );

      const userDocRef = doc(db, "usuarios", firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log("✅ Datos del usuario cargados:", userData);

        return {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          nombre: userData.nombre || "Usuario",
          apellido: userData.apellido || "",
          telefono: userData.telefono || "",
          avatar: userData.avatar || "👤",
          saldoInicial: userData.saldoInicial || 0,
          createdAt: userData.createdAt,
        };
      } else {
        // Si no existe documento en Firestore, usar datos básicos de Firebase Auth
        console.warn(
          "⚠️ No se encontró documento en Firestore, usando datos de Auth",
        );

        const displayName =
          firebaseUser.displayName ||
          firebaseUser.email?.split("@")[0] ||
          "Usuario";

        return {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          nombre: displayName,
          apellido: "",
          telefono: "",
          avatar: "👤",
          saldoInicial: 0,
        };
      }
    } catch (error) {
      console.error("❌ Error cargando datos del usuario:", error);

      // Fallback a datos básicos
      const displayName =
        firebaseUser.displayName ||
        firebaseUser.email?.split("@")[0] ||
        "Usuario";

      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        nombre: displayName,
        apellido: "",
        telefono: "",
        avatar: "👤",
        saldoInicial: 0,
      };
    }
  };

  // Escuchar cambios en la autenticación
  useEffect(() => {
    if (!firebaseEnabled || !auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Usuario autenticado - cargar datos completos desde Firestore
        const userData = await loadUserData(firebaseUser);
        setUser(userData);

        console.log("✅ Usuario autenticado:", {
          uid: userData.uid,
          email: userData.email,
          nombre: userData.nombre,
        });
      } else {
        setUser(null);
        console.log("ℹ️ No hay usuario autenticado");
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Registrar usuario
  const register = async (userData) => {
    try {
      const { email, password, nombre, apellido, telefono } = userData;

      console.log("🔄 Iniciando registro para:", email);

      // 1. Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      console.log("✅ Usuario creado en Auth:", userCredential.user.uid);

      // 2. Guardar datos adicionales en Firestore PRIMERO
      const userDocRef = doc(db, "usuarios", userCredential.user.uid);
      await setDoc(userDocRef, {
        nombre: nombre,
        apellido: apellido,
        email: email,
        telefono: telefono || "",
        avatar: "👤",
        saldoInicial: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      console.log("✅ Datos guardados en Firestore");

      // 3. Actualizar perfil con nombre completo en Firebase Auth
      const nombreCompleto = `${nombre} ${apellido}`;
      await updateProfile(userCredential.user, {
        displayName: nombreCompleto,
      });

      console.log("✅ DisplayName actualizado:", nombreCompleto);

      // 4. Cargar datos completos del usuario inmediatamente
      const fullUserData = await loadUserData(userCredential.user);
      setUser(fullUserData);

      console.log("✅ Datos de usuario cargados:", fullUserData);

      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error("❌ Error en registro:", error.code, error.message);
      throw error;
    }
  };

  // Iniciar sesión
  const login = async (email, password) => {
    try {
      console.log("🔄 Iniciando sesión para:", email);
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      console.log("✅ Login exitoso:", userCredential.user.uid);

      // El onAuthStateChanged se encargará de cargar los datos desde Firestore
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error("❌ Error en login:", error.code, error.message);
      throw error;
    }
  };

  // Cerrar sesión
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      console.log("✅ Sesión cerrada");
    } catch (error) {
      console.error("❌ Error al cerrar sesión:", error);
      throw error;
    }
  };

  // Recuperar contraseña
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      console.log("✅ Email de recuperación enviado");
      return { success: true };
    } catch (error) {
      console.error("❌ Error al enviar email:", error);
      throw error;
    }
  };

  // Actualizar datos del usuario (ahora también actualiza Firestore)
  const updateUser = async (newData) => {
    try {
      if (!user) {
        console.warn("⚠️ No hay usuario para actualizar");
        return { success: false };
      }

      console.log("🔄 Actualizando usuario:", newData);

      // Actualizar en Firestore
      const userDocRef = doc(db, "usuarios", user.uid);
      await setDoc(
        userDocRef,
        {
          ...newData,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }, // merge: true para no sobrescribir todo el documento
      );

      // Actualizar estado local
      setUser((prev) => ({ ...prev, ...newData }));
      console.log("✅ Usuario actualizado");

      return { success: true };
    } catch (error) {
      console.error("❌ Error al actualizar usuario:", error);
      throw error;
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    resetPassword,
    updateUser,
    isAuthenticated: !!user,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Hook personalizado
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
};

export default AuthContext;

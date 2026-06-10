
import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  EmailField,
  SelectField,
  DeleteButton,
  EditButton,
  useRecordContext,
  FunctionField,
} from 'react-admin';

// Vista de listado de usuarios del panel admin (tabla con acciones de editar rol y eliminar).

// Etiqueta de color para el rol: azul si es ADMIN, gris si es USER.
const RolBadge = () => {
  const record = useRecordContext();
  if (!record) return null;
  const isAdmin = record.rol === 'ADMIN';
  return (
    <span style={{
      display:       'inline-block',
      padding:       '2px 10px',
      borderRadius:  '999px',
      fontSize:      '0.75rem',
      fontWeight:    700,
      background:    isAdmin ? '#dbeafe' : '#f3f4f6',
      color:         isAdmin ? '#1d4ed8' : '#374151',
    }}>
      {record.rol}
    </span>
  );
};

export const UserList = () => (
  <List
    title="Usuarios registrados"
    sort={{ field: 'nombre', order: 'ASC' }}
    perPage={25}
  >
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <TextField  source="id"       label="ID"      sortable={false} />
      <TextField  source="nombre"   label="Nombre"  />
      <TextField  source="apellido" label="Apellido" />
      <EmailField source="email"    label="Email"   />
      <FunctionField label="Rol" render={() => <RolBadge />} />
      <FunctionField
        label="Saldo inicial"
        render={r => r.saldoInicial != null ? `${r.saldoInicial.toFixed(2)} €` : '—'}
      />
      <EditButton   label="Cambiar rol" />
      <DeleteButton label="Eliminar"    />
    </Datagrid>
  </List>
);

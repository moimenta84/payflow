import React from 'react';
import {
  Edit,
  SimpleForm,
  TextInput,
  SelectInput,
  Toolbar,
  SaveButton,
} from 'react-admin';

const EditToolbar = () => (
  <Toolbar>
    <SaveButton label="Guardar cambios" />
  </Toolbar>
);

export const UserEdit = () => (
  <Edit title="Editar usuario">
    <SimpleForm toolbar={<EditToolbar />}>
      <TextInput source="id"       label="ID"      disabled />
      <TextInput source="nombre"   label="Nombre"  disabled />
      <TextInput source="apellido" label="Apellido" disabled />
      <TextInput source="email"    label="Email"   disabled />
      <SelectInput
        source="rol"
        label="Rol"
        choices={[
          { id: 'USER',  name: 'USER  — acceso normal' },
          { id: 'ADMIN', name: 'ADMIN — administrador' },
        ]}
      />
    </SimpleForm>
  </Edit>
);

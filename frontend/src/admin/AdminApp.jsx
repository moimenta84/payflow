import React from 'react';
import { Admin, Resource, Layout, AppBar, TitlePortal } from 'react-admin';
import { Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { UserList }   from './UserList';
import { UserEdit }   from './UserEdit';
import dataProvider   from './adminDataProvider';
import authProvider   from './adminAuthProvider';

// Panel de administración construido con React-Admin: librería que monta CRUDs casi sin código.
// Solo le damos un dataProvider (de dónde saca los datos) y un authProvider (cómo valida al admin).

// Barra superior personalizada con un botón para volver a la app de usuario normal.
const AdminAppBar = () => (
  <AppBar>
    <TitlePortal />
    <Button
      color="inherit"
      href="/home"
      startIcon={<ArrowBackIcon />}
      sx={{ ml: 'auto' }}
    >
      Volver a la app
    </Button>
  </AppBar>
);

const AdminLayout = (props) => <Layout {...props} appBar={AdminAppBar} />;

export default function AdminApp() {
  return (
    <Admin
      title="PayFlow Admin"
      layout={AdminLayout}
      dataProvider={dataProvider}
      authProvider={authProvider}
      disableTelemetry
    >
      {/* Cada Resource es una entidad gestionable. Aquí solo gestionamos "users" (listar y editar). */}
      <Resource
        name="users"
        list={UserList}
        edit={UserEdit}
        options={{ label: 'Usuarios' }}
      />
    </Admin>
  );
}

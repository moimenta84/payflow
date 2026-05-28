import React from 'react';
import { Admin, Resource, Layout, AppBar, TitlePortal } from 'react-admin';
import { Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { UserList }   from './UserList';
import { UserEdit }   from './UserEdit';
import dataProvider   from './adminDataProvider';
import authProvider   from './adminAuthProvider';

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
      <Resource
        name="users"
        list={UserList}
        edit={UserEdit}
        options={{ label: 'Usuarios' }}
      />
    </Admin>
  );
}

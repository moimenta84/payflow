import React from 'react';
import { Admin, Resource } from 'react-admin';
import { UserList }   from './UserList';
import { UserEdit }   from './UserEdit';
import dataProvider   from './adminDataProvider';
import authProvider   from './adminAuthProvider';

export default function AdminApp() {
  return (
    <Admin
      title="PayFlow Admin"
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

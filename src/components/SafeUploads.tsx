
import React from 'react';
import { Dashboard } from './Dashboard';

export function SafeUploads(props: any) {
  return (
    <Dashboard
      {...props}
      filterMode="safe"
    />
  );
}
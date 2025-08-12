import React from 'react';
import { Dashboard } from './Dashboard';

export function FlaggedFiles(props: any) {
  return (
    <Dashboard
      {...props}
      filterMode="flagged"
    />
  );
}
import React from 'react';
import { createRoot } from 'react-dom/client';

import ManageApp from './ManageApp';
import '../popup/style.css';

const container = document.getElementById('root');

if (container) {
  createRoot(container).render(
    <React.StrictMode>
      <ManageApp />
    </React.StrictMode>,
  );
}

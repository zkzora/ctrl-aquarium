import React from 'react';
import { createRoot } from 'react-dom/client';
import CtrlSite from '../app/ctrl-site';
import '../app/globals.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><CtrlSite /></React.StrictMode>);

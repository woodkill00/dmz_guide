import { setupNavigationMenu } from '../../../src/client/navigation-menu.mjs';
setupNavigationMenu();

import {mountWorkspaceShell} from "../../../src/ui/workspace-shell.mjs";
mountWorkspaceShell(document,{mounted:false});

if(document.documentElement.dataset.uiVariant==='modern')await import('../../../src/client/theme.mjs');

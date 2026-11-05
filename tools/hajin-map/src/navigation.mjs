import { setupNavigationMenu } from '../../../src/client/navigation-menu.mjs';
setupNavigationMenu();

import {mountWorkspaceShell} from "../../../src/ui/workspace-shell.mjs";
mountWorkspaceShell(document,{mounted:false});

import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { RegisterComponent } from './components/register/register';
import { UploadExcel } from './upload-excel/upload-excel';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'register',
    component: RegisterComponent
  },
  {
    path: 'home',
    component: UploadExcel,
    canActivate: [authGuard]
  },
  {
    path: 'upload',
    component: UploadExcel,
    canActivate: [authGuard, adminGuard]
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginRequest } from '../../models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  credentials: LoginRequest = {
    username: '',
    password: ''
  };
  
  errorMessage = '';
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    console.log('🔹 LoginComponent constructor');
    // Si ya está autenticado, redirigir
    if (this.authService.isAuthenticated()) {
      const isAdmin = this.authService.isAdmin();
      console.log('👤 Ya autenticado, redirigiendo...', isAdmin ? 'admin' : 'usuario');
      this.router.navigate([isAdmin ? '/upload' : '/home']);
    }
  }

  onSubmit(): void {
    console.log('🔹 onSubmit llamado');
    
    if (!this.credentials.username || !this.credentials.password) {
      this.errorMessage = 'Por favor complete todos los campos';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    console.log('⏳ Intentando login...');

    this.authService.login(this.credentials).subscribe({
      next: (response) => {
        console.log('✅ Login exitoso:', response.user.username);
        console.log('📋 Rol del usuario:', response.user.role);
        console.log('🔑 Token guardado:', !!localStorage.getItem('access_token'));
        console.log('👤 Usuario guardado:', !!localStorage.getItem('currentUser'));
        
        // Verificar autenticación
        const isAuth = this.authService.isAuthenticated();
        const isAdmin = this.authService.isAdmin();
        console.log('🔍 isAuthenticated:', isAuth);
        console.log('🔍 isAdmin:', isAdmin);
        
        // Redirigir según el rol
        const targetRoute = response.user.role === 'admin' ? '/upload' : '/home';
        console.log('🚀 Navegando a:', targetRoute);
        
        this.router.navigate([targetRoute]).then(success => {
          console.log('✅ Navegación completada:', success);
          if (!success) {
            console.error('❌ Navegación falló');
          }
        }).catch(err => {
          console.error('❌ Error en navegación:', err);
        });
      },
      error: (error) => {
        console.error('❌ Error en login:', error);
        this.errorMessage = error.error?.detail || 'Usuario o contraseña incorrectos';
        this.isLoading = false;
      },
      complete: () => {
        console.log('🏁 Login complete');
        this.isLoading = false;
      }
    });
  }
}
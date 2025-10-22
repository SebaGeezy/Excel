import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { trigger, transition, style, animate } from '@angular/animations';
import { Excel } from '../excel';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';

@Component({
  selector: 'app-upload-excel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upload-excel.html',
  styleUrls: ['./upload-excel.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('0.4s ease-in', style({ opacity: 1 }))
      ])
    ]),
    trigger('fadeOut', [
      transition(':leave', [
        animate('0.4s ease-out', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class UploadExcel implements OnInit {
  // Usuario actual
  currentUser: User | null = null;
  
  // Propiedades existentes
  selectedFile: File | null = null;
  progress = -1;
  message = '';
  excelData: any[] = [];
  uploadedFiles: Set<string> = new Set();
  expandedFiles: Set<string> = new Set();
  showDeleted: boolean = false;

  constructor(
    private excelService: Excel,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    console.log('🔹 Componente inicializado');
    
    // Verificar autenticación
    this.currentUser = this.authService.getCurrentUser();
    
    if (!this.currentUser) {
      console.log('❌ Usuario no autenticado, redirigiendo...');
      this.router.navigate(['/login']);
      return;
    }
    
    console.log('✅ Usuario autenticado:', this.currentUser.username, '- Rol:', this.currentUser.role);
    this.loadData();
  }

  // Verificar si el usuario es admin
  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];

    if (!file) {
      this.selectedFile = null;
      return;
    }

    // Validación de extensión
    const validExtensions = ['xlsx', 'xls'];
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !validExtensions.includes(fileExt)) {
      Swal.fire({
        icon: 'error',
        title: '¡Error!',
        text: 'Solo se permiten archivos Excel (.xlsx, .xls)',
      });
      this.selectedFile = null;
      return;
    }

    // Validación de archivo duplicado
    const duplicate = this.excelData.some(row =>
      row.isHeader && !row.is_deleted && row.file_name === file.name
    );
    if (duplicate) {
      Swal.fire({
        icon: 'warning',
        title: '¡Archivo duplicado!',
        text: 'Ya subiste un archivo con este nombre',
      });
      this.selectedFile = null;
      return;
    }

    this.selectedFile = file;
    console.log('📂 Archivo seleccionado:', this.selectedFile.name);
  }

  onUpload() {
    // Verificar permisos de admin
    if (!this.isAdmin) {
      Swal.fire({
        icon: 'error',
        title: 'Sin permisos',
        text: 'Solo los administradores pueden subir archivos',
      });
      return;
    }

    if (!this.selectedFile) {
      Swal.fire({
        icon: 'warning',
        title: 'Selecciona un archivo',
        text: 'Debes elegir un archivo Excel válido antes de subirlo',
      });
      return;
    }

    this.progress = 0;
    console.log('⏳ Iniciando subida del archivo...');

    let visualProgress = 0;
    const interval = setInterval(() => {
      if (visualProgress < 95) {
        visualProgress += 1;
        this.progress = visualProgress;
      }
    }, 50);

    this.excelService.uploadExcel(this.selectedFile).subscribe({
      next: (p: number) => {
        if (p > visualProgress) {
          visualProgress = p;
          this.progress = visualProgress;
        }
        console.log(`📊 Progreso real: ${p}%`);
      },
      error: (err) => {
        clearInterval(interval);
        console.error('❌ Error al subir el archivo:', err);
        this.progress = -1;
        
        // Manejar error de autenticación
        if (err.status === 401 || err.status === 403) {
          Swal.fire({
            icon: 'error',
            title: 'Sin autorización',
            text: 'No tienes permisos para subir archivos. Inicia sesión nuevamente.',
          }).then(() => {
            this.authService.logout();
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err.error?.detail || 'Ocurrió un problema al subir el archivo',
          });
        }
      },
      complete: () => {
        clearInterval(interval);
        this.progress = 100;
        setTimeout(() => this.progress = -1, 500);

        Swal.fire({
          icon: 'success',
          title: '¡Éxito!',
          text: `Archivo "${this.selectedFile?.name}" subido correctamente`,
        });

        if (this.selectedFile) {
          this.uploadedFiles.add(this.selectedFile.name);
          this.expandedFiles.add(this.selectedFile.name);
        }

        this.selectedFile = null;
        this.loadData();
      }
    });
  }

  loadData() {
  this.excelService.getExcelData(this.showDeleted).subscribe({
    next: (response: any) => {
      console.log('📦 Respuesta del backend:', response);
      
      // El backend devuelve un objeto con la propiedad 'data'
      const data = response.data || response;
      
      if (!Array.isArray(data)) {
        console.error('❌ Los datos no son un array:', data);
        this.excelData = [];
        return;
      }

      const grouped: any[] = [];
      let currentFile = '';
      let colspan = 1;

      if (data.length > 0) {
        colspan = Object.keys(data[0].row_data).length + 1;
      }

      data.forEach((row: any) => {
        if (row.file_name !== currentFile) {
          grouped.push({
            isHeader: true,
            file_name: row.file_name,
            colspan,
            is_deleted: row.is_deleted
          });
          currentFile = row.file_name;
        }
        grouped.push({ ...row, isHeader: false });
      });

      this.excelData = grouped;
      console.log('✅ Datos cargados:', this.excelData.length, 'registros');
    },
    error: (err) => {
      console.error('❌ Error al obtener datos:', err);
      
      // Manejar error de autenticación
      if (err.status === 401) {
        Swal.fire({
          icon: 'error',
          title: 'Sesión expirada',
          text: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.',
        }).then(() => {
          this.authService.logout();
        });
      }
    }
  });
}

  getKeysForHeader(group: any): string[] {
    const firstRow = this.excelData.find(
      (row: any) => !row.isHeader && row.file_name === group.file_name
    );
    return firstRow ? Object.keys(firstRow.row_data) : [];
  }

  toggleFile(fileName: string) {
    if (this.expandedFiles.has(fileName)) {
      this.expandedFiles.delete(fileName);
    } else {
      this.expandedFiles.add(fileName);
    }
  }

  isExpanded(fileName: string): boolean {
    return this.expandedFiles.has(fileName);
  }

  onDelete(fileName: string) {
    // Verificar permisos de admin
    if (!this.isAdmin) {
      Swal.fire({
        icon: 'error',
        title: 'Sin permisos',
        text: 'Solo los administradores pueden eliminar archivos',
      });
      return;
    }

    Swal.fire({
      icon: 'warning',
      title: '⚠️ Confirmar borrado',
      text: `¿Desea borrar el archivo "${fileName}"?`,
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, borrar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.excelService.logicalDeleteExcel(fileName).subscribe({
          next: (res) => {
            Swal.fire({
              icon: 'success',
              title: 'Archivo Borrado',
              text: `El archivo "${fileName}" ha sido borrado correctamente.`,
            });
            this.uploadedFiles.delete(fileName);
            this.expandedFiles.delete(fileName);
            this.loadData();
          },
          error: (err) => {
            console.error('❌ Error al borrar:', err);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: err.error?.detail || `No se pudo borrar el archivo "${fileName}".`,
            });
          }
        });
      }
    });
  }

  toggleShowDeleted() {
    this.showDeleted = !this.showDeleted;
    this.loadData();
  }

  logout(): void {
    Swal.fire({
      icon: 'question',
      title: '¿Cerrar sesión?',
      text: '¿Estás seguro de que quieres cerrar sesión?',
      showCancelButton: true,
      confirmButtonColor: '#4e73df',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, cerrar sesión',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.authService.logout();
      }
    });
  }
}
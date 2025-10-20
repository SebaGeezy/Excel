import { Component } from '@angular/core';
import { Excel } from '../excel';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { trigger, state, style, animate, transition } from '@angular/animations';

@Component({
  selector: 'app-upload-excel',
  imports: [CommonModule],
  templateUrl: './upload-excel.html',
  styleUrl: './upload-excel.css',
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
export class UploadExcel {
  selectedFile: File | null = null;
  progress = -1;
  message = '';
  excelData: any[] = [];
  uploadedFiles: Set<string> = new Set();
  expandedFiles: Set<string> = new Set();
  showDeleted: boolean = false;


  constructor(private excelService: Excel) { }

  ngOnInit(): void {
    console.log('🔹 Componente inicializado');
    this.loadData();
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

  // Validación de archivo duplicado: buscar en excelData archivos activos con mismo nombre
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

  let visualProgress = 0; // progreso que verá el usuario
  const interval = setInterval(() => {
    if (visualProgress < 95) { // sube lentamente hasta 95%
      visualProgress += 1; // velocidad: 1% por tick
      this.progress = visualProgress;
    }
  }, 50); // cada 50ms → 1% cada 50ms → ~5s hasta 95%

  this.excelService.uploadExcel(this.selectedFile).subscribe({
    next: (p: number) => {
      // actualiza visualmente hasta el valor real si es mayor
      if (p > visualProgress) {
        visualProgress = p;
        this.progress = visualProgress;
      }
      console.log(`📊 Progreso real: ${p}%`);
    },
    error: err => {
      clearInterval(interval);
      console.error('❌ Error al subir el archivo:', err);
      this.progress = -1; // desaparece la barra
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un problema al subir el archivo',
      });
    },
    complete: () => {
      clearInterval(interval);
      this.progress = 100; // llega al final
      setTimeout(() => this.progress = -1, 500); // desaparece con fade

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
      next: data => {
        const grouped: any[] = [];
        let currentFile = '';
        let colspan = 1;

        if (data.length > 0) {
          colspan = Object.keys(data[0].row_data).length + 1;
        }

        data.forEach(row => {
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
      },
      error: err => {
        console.error('❌ Error al obtener datos:', err);
      }
    });
  }

  getKeysForHeader(group: any): string[] {
    const firstRow = this.excelData.find(
      row => !row.isHeader && row.file_name === group.file_name
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
    Swal.fire({
      icon: 'warning',
      title: '⚠️ Confirmar borrado',
      text: `¿Desea borarr el archivo?`,
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.excelService.logicalDeleteExcel(fileName).subscribe({
          next: res => {
            Swal.fire({
              icon: 'success',
              title: 'Archivo Borrado Correctamente',
              text: `El archivo "${fileName}" ha sido borrado correctamente.`,
            });
            this.uploadedFiles.delete(fileName);
            this.expandedFiles.delete(fileName);
            this.loadData();
          },
          error: err => {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: `No se pudo borrar el archivo "${fileName}".`,
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


}

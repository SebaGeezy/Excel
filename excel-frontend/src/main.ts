import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { UploadExcel } from './app/upload-excel/upload-excel';

bootstrapApplication(UploadExcel, {
  providers: [
    provideHttpClient()
  ]
}).catch(err => console.error(err));

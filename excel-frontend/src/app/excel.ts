import { HttpClient, HttpEventType, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Excel {
  private baseUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  uploadExcel(file: File): Observable<number> {
    const formData = new FormData();
    formData.append('file', file);

    const req = new HttpRequest('POST', `${this.baseUrl}/upload_excel/`, formData, {
      reportProgress: true
    });

    return this.http.request(req).pipe(
      map(event => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          return Math.round((event.loaded / event.total) * 100);
        } else if (event.type === HttpEventType.Response) {
          return 100;
        } else {
          return 0;
        }
      })
    );
  }

  getExcelData(showDeleted: boolean = false): Observable<any[]> {
    const url = `${this.baseUrl}/data/?showDeleted=${showDeleted}`;
    return this.http.get<any[]>(url);
  }

  logicalDeleteExcel(filename: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/delete_excel/${filename}`);
  }
}

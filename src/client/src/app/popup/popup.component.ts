import { Component } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { inject, model } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-popup',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,
    CommonModule
  ],
  templateUrl: './popup.component.html',
  styleUrl: './popup.component.css'
})
export class PopupComponent {
  readonly dialogRef = inject(MatDialogRef<PopupComponent>);
  readonly data = inject(MAT_DIALOG_DATA);
  readonly dialogtitle = this.data.dialogtitle;
  nameInvalid: any;

  ngAfterViewInit() {
    const element = document.getElementById('Contactname') as HTMLInputElement;
    if (element && !element.value) {
      this.nameInvalid = true;
    } else {
      this.nameInvalid = false;
    }
  }

  onNoClick(): void {
    this.dialogRef.close();
  }
  onSubmit() {

  }

}

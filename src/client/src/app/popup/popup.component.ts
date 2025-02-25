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
import { ChangeDetectorRef } from '@angular/core';
import {  ViewChild, ElementRef, AfterViewInit } from '@angular/core';

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
  isSubmitted:boolean = false;
  formdata:any = {
    name:'',
    countrycode:'1',
    phone:''};
      @ViewChild('cell') cell!: ElementRef;

    constructor(private cdr: ChangeDetectorRef) {}


  ngAfterViewInit() {
    
  }
  formatphone(){
    this.formdata.phone = this.formdata.phone.replace(/\D/g,"");
    console.log(this.formdata.phone);
   let cellphone = this.cell.nativeElement;
   this.formdata.phone = this.formdata.phone.replace(
    /^(\d{3})(\d{3})(\d{4})$/,
    "($1) $2-$3"
  );   cellphone.value =  this.formdata.phone;
    this.cdr.detectChanges();
  }

  onNoClick(): void {
    this.dialogRef.close();
  }
  onSubmit(form : any) {
    this.isSubmitted = true;
    
    
    if(form.invalid){
      
    }
    else{
      
    }

  }

}

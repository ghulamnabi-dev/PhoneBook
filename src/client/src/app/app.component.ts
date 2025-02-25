import { Component,ViewEncapsulation } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms'; 
import {ChangeDetectionStrategy, inject, model, signal} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { PopupComponent } from './popup/popup.component';

@Component({
  selector: 'app-root',
  imports: [CommonModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,

  standalone: true,
  templateUrl: './app.component.html',
  styleUrls:[ './app.component.css'],
  encapsulation: ViewEncapsulation.None // Add this line

})
export class AppComponent {
  title = 'Phonebook';
  constructor(){}
  ngOnInit(){
    this.togglesetter();
  }
  cellnames = [ { name : "Ali", cell: "03011427871"},
    { name : "sajdsad", cell: "898593485945"},
    { name : "sajdsad", cell: "898593485945"},
   
  ];
   isHaveContact :boolean = false;
  isHavenotContact :boolean = true;
  readonly dialog = inject(MatDialog);
  dialogtitle = "";

  
  togglesetter(){
    if(this.cellnames.length > 0)
    {
      this.isHaveContact = true;
      this.isHavenotContact = false;
    }

  }
  addcontact(){
    console.log("entered in add method");

    this.dialogtitle = "Add Contact";
     this.openDialog();
  }
  editcontact(){
    this.dialogtitle = "Edit Contact";
   
    this.openDialog();
  }
  openDialog(): void {
    console.log("entered in dialogue method");
    const dialogRef = this.dialog.open(PopupComponent, {
      width: '432px',
      height: '290px', 
      panelClass : 'mat-dialog-container',
        data: {  dialogtitle: this.dialogtitle,} 

        //
         });
    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      if (result !== undefined) {
       console.log("no data");
      }
    });
  }
}

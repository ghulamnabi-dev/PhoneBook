import { Component } from '@angular/core';
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
  styleUrls:[ './app.component.css']
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
    this.dialogtitle = "Add Contact";
  }
  editcontact(){
    this.title = "Edit Contact"

  }
  // openDialog(): void {
  //   const dialogRef = this.dialog.open(DialogOverviewExampleDialog, {
  //     data: {dialogtitle: this.dialogtitle},
  //   });
  //   dialogRef.afterClosed().subscribe(result => {
  //     console.log('The dialog was closed');
  //     if (result !== undefined) {
  //      console.log("no data");
  //     }
  //   });
  // }
}

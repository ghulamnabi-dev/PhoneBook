import { ChangeDetectorRef, Component,ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms'; 
import {ChangeDetectionStrategy, inject, model, signal} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PopupComponent } from '../popup/popup.component';
import { PhoneBookService } from '../phone-book.service';

@Component({
  selector: 'app-home',
  imports: [CommonModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,],
  changeDetection: ChangeDetectionStrategy.Default,

  standalone: true,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})

export class HomeComponent {
  title = 'Phonebook';
  cellnames: any= [];
  EditContact:any;
  
  constructor(private phonebookService: PhoneBookService){}
  cd = inject(ChangeDetectorRef);
  ngOnInit(){
  
    this.fetchcontacts();
    
  }
  
   isHaveContact :boolean = false;
  isHavenotContact :boolean = true;
  readonly dialog = inject(MatDialog);
  dialogtitle = "";

  fetchcontacts() {
    this.phonebookService.getContacts().subscribe({
      next: (data) => {
        this.cellnames = data;
        this.togglesetter();
        console.log("cellnames data", this.cellnames);
      },
      error: (error) => {
        console.error('Error fetching phonebook data', error);
      }
    });
  }
  
  togglesetter(){
    
    if(this.cellnames.length > 0)
    {
      this.isHaveContact = true;
      this.isHavenotContact = false;
    }else{
      this.isHaveContact = false;
      this.isHavenotContact = true;

    }
    
    this.cd.detectChanges();
  }
  addcontact(){
    console.log("entered in add method");
    this.dialogtitle = "Add Contact";
     this.openDialog();
     
  }
  deletecontact(contact:any){
    this.phonebookService.deleteContact(contact.id).subscribe(
      (data) => {
        let deletedcontactdata = data; // Store fetched data
        console.log("data=",deletedcontactdata);
        
        this.fetchcontacts();
        this.togglesetter();
      },
      (error) => {
        console.error('Error getting deleted phonebook data', error); // Handle error
      }
    );

  }


  editcontact(contact:any){
    
    this.dialogtitle = "Edit Contact";
   this.EditContact = contact;

   this.openDialog();
   

  }


  openDialog(): void {

    console.log("entered in dialogue method");
    const dialogRef = this.dialog.open(PopupComponent, {
      width: '432px',
      height: '290px', 
      panelClass : 'mat-dialog-container',
        data: {  dialogtitle: this.dialogtitle,
                  editContact:this.EditContact

        } 
                                                       });

      //after dialogue closed

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      this.fetchcontacts();
      this.togglesetter();
    });
 
  }

}

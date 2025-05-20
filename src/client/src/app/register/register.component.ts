import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-register',
  imports: [FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  name: string = '';
  username: string = '';
  password: string = '';
  
  onRegister() {
    console.log('Registering:', this.name, this.username, this.password);
    // You can send this to your API or mock service here
  }
  
}

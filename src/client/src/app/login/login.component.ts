import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {

  email: string = '';
password: string = '';

onLogin() {
  console.log('Email:', this.email);
  console.log('Password:', this.password);
  // Call your service here and save token to localStorage
}

}

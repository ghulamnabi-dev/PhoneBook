import { Component,ViewEncapsulation } from '@angular/core';
import { HomeComponent } from "./home/home.component";
import { LoginComponent } from "./login/login.component";
import { RegisterComponent } from "./register/register.component";
import { RouterOutlet } from '@angular/router';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls:[ './app.component.css'],
  encapsulation: ViewEncapsulation.None // Add this line

})
export class AppComponent {
 
  

}

import { Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
export const routes: Routes = [
    {path:"",component:RegisterComponent},
    {path:"App", component:AppComponent},
    {path:"Home",component:HomeComponent},
    {path:"Login",component:LoginComponent},
    
];

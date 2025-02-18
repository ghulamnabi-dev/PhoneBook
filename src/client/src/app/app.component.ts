import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [CommonModule
  ],
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls:[ './app.component.css']
})
export class AppComponent {
  title = 'Phonebook';

  cellname = [
    { name : "Ali", cell: "03011427871"},
    { name : "sajdsad", cell: "898593485945"},
    { name : "sajdsad", cell: "898593485945"},
  ];
}

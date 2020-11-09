import { Component, OnInit, ViewChild } from '@angular/core';
import { Subscription } from "rxjs";
import { LoadingController, AlertController, Platform } from '@ionic/angular';
import { Router } from '@angular/router';

import { AppGetService } from "../../shared/services/app-get.service";
import { Statement } from '@angular/compiler';

@Component({
  selector: 'app-listing',
  templateUrl: './listing.page.html',
  styleUrls: ['./listing.page.scss'],
})
export class ListingPage implements OnInit {
  @ViewChild('rating') rating: any;
  public listinData = [];
  public searchData: any;
  public subscriptions: Subscription[] = [];
  loading: any;
  constructor(private platform: Platform, private router: Router, private appGetService: AppGetService, public loadingController: LoadingController) {
    const user = JSON.parse(localStorage.getItem('currentUserData'));
    this.platform.backButton.subscribeWithPriority(10, () => {
      this.router.navigate(['/searchprovider']);
    });
  }

  ngOnInit() {
    this.loadListing();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subs => subs.unsubscribe());
  }

  private async loadListing() {
    this.loading = await this.loadingController.create({
      message: 'Loading please wait',
    });
    this.loading.present();

    const subs = this.appGetService.listingData.subscribe(res => {
      if (res?.listing) {
        this.loading.dismiss();
        this.listinData = res['listing'];
        this.searchData = res['params'];
      } else {
        this.loading.dismiss();
      }
    })
  }

  public setStar(point) {
    if (!point) return 0;
    return `${(point * 20)}px`;
  }

  public getStartTime(sTime) {
    let time = sTime.slice(0, -3);
    time = time.toString().match(/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];

    if (time.length > 1) { // If time format correct
      time = time.slice(1);  // Remove full string match value
      time[5] = +time[0] < 12 ? ' AM' : ' PM'; // Set AM/PM
      time[0] = +time[0] % 12 || 12; // Adjust hours
    }
    return time.join('');
  }

  public getHours(sTime, eTime) {
    const time_start: any = new Date();
    const time_end: any = new Date();
    const value_start = sTime.split(':');
    const value_end = eTime.split(':');

    time_start.setHours(value_start[0], value_start[1], value_start[2], 0)
    time_end.setHours(value_end[0], value_end[1], value_end[2], 0)

    const hrs = Math.ceil((time_end - time_start) / 60 / 60 / 1000);
    return hrs;
  }

  public getAmount(sTime, eTime, amount) {
    const hrs = this.getHours(sTime, eTime);
    return hrs * Number(amount);

  }

  public bookService() {
    const user = JSON.parse(localStorage.getItem('currentUserData'));
    if (!user) {
      this.router.navigate(['/sign-in'], {
        queryParams: {
          return: '/payment'
        }
      });
    } else if (user && user['token']) {
      this.router.navigate(['/payment']);
    }
  }

}
import { Component, OnInit } from '@angular/core';
import { PayPal, PayPalPayment, PayPalConfiguration } from '@ionic-native/paypal/ngx';
import { Router, ActivatedRoute } from '@angular/router';
import { LoadingController, Platform, ModalController } from '@ionic/angular';
import { AppPostService } from "../../shared/services/app-post.service";
import { Subscription } from 'rxjs';
import { AppGetService } from "../../shared/services/app-get.service";
import { PaymentType } from './payment-type';
import { InAppBrowser, InAppBrowserEvent, InAppBrowserOptions, InAppBrowserObject } from '@ionic-native/in-app-browser/ngx';

@Component({
  selector: 'app-payment',
  templateUrl: './payment.page.html',
  styleUrls: ['./payment.page.scss'],
})
export class PaymentPage implements OnInit {
  modalGl: any;
  currencyIcon = '$';
  currency = 'USD';
  paymentData;
  paymentOption = "paypal";
  existingCardDetails;
  cvv = {};
  month = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  public subscriptions: Subscription[] = [];
  paypalResponse = '';
  loading: any;
  nameInCard: any = '';
  cardNumber: any = '';
  selectedMonth: any = '';
  selectedYear: any = '';
  cardCvv: any = '';
  submitted = false;
  errorObj = {
    nameInCard: { valid: true },
    cardNumber: { valid: true },
    selectedMonth: { valid: true },
    selectedYear: { valid: true },
    cardCvv: { valid: true },
  }
  constructor(private appGetService: AppGetService, private appPostService: AppPostService, public loadingController: LoadingController, private platform: Platform, private payPal: PayPal, private route: ActivatedRoute, private router: Router, public modalController: ModalController, private iab: InAppBrowser) {
    this.route.queryParams.subscribe(params => {
      this.paymentData = params.return || '';
    });
  }

  ngOnInit() {

  }

  ionViewDidEnter() {
    this.loadExistingCard();
  }

  ionViewWillEnter() {

    const backEvent = this.platform.backButton.subscribe(() => {
      this.router.navigate(['/searchprovider']);
    });
    this.subscriptions.push(backEvent);

  }

  ionViewDidLeave() {
    this.subscriptions.forEach(subs => subs.unsubscribe());
  }

  private async loadExistingCard() {
    this.loading = await this.loadingController.create({
      message: 'Loading please wait',
    });
    this.loading.present();
    const user = JSON.parse(localStorage.getItem('currentUserData'));
    const subs = this.appGetService.getCardDetails(user['cust_id']).subscribe(res => {
      if (res?.getallcard && res.getallcard?.data && res.getallcard.data.length) {
        this.existingCardDetails = res['getallcard']['data'];
        this.paymentOption = res['getallcard']['data'][0]['id'];
        res['getallcard']['data'].forEach(element => {
          this.cvv[element.id] = '';
        });
      }
      this.loading.dismiss();
    }, error => {
      this.loading.dismiss();
      console.error(error);
    });
    this.subscriptions.push(subs);
  }

  public valid() {
    let returnV = true;

    if (!this.nameInCard) {
      returnV = false;
      this.errorObj.nameInCard.valid = false;
    } else {
      this.errorObj.nameInCard.valid = true;
    }
    if (!this.cardNumber) {
      returnV = false;
      this.errorObj.cardNumber.valid = false;
    } else {
      this.errorObj.cardNumber.valid = true;
    }
    if (!this.selectedMonth) {
      returnV = false;
      this.errorObj.selectedMonth.valid = false;
    } else {
      this.errorObj.selectedMonth.valid = true;
    }
    if (!this.selectedYear) {
      returnV = false;
      this.errorObj.selectedYear.valid = false;
    } else {
      this.errorObj.selectedYear.valid = true;
    }
    if (!this.cardCvv) {
      returnV = false;
      this.errorObj.cardCvv.valid = false;
    } else {
      this.errorObj.cardCvv.valid = true;
    }

    return returnV;
  }

  public getPaymentDetails(evt) {
    console.log(this.paymentOption);
    if (this.paymentOption === 'paypal') {
      this.payWithPaypal();
    } else if (this.paymentOption === 'newCard') {
      this.submitted = true;
      if (this.valid())
        this.newCardayment();
    } else {
      this.existingCard(this.paymentOption);
    }
  }
  async presentModal(url) {
    this.modalGl = await this.modalController.create({
      component: PaymentType,
      cssClass: 'modal-class-privacy',
      componentProps: {
        "paramURL": url
      }
    });
    return await this.modalGl.present();
  }

  public openPaymentSecure(url, obj) {
    const browser: InAppBrowserObject = this.iab.create(url, '_blank', { location: 'no', zoom: 'yes' });
    const watch = browser.on("loadstop").subscribe((event: InAppBrowserEvent) => {
      if (event.url.indexOf('https://depannedakar.skylineserves.in/api/auth/confirmstripe') != -1) {
        browser.close();
        this.paymentCheckStatus(obj);
      }
    })
  }

  public async paymentCheckStatus(obj) {
    this.loading = await this.loadingController.create({
      message: 'Loading please wait',
    });
    this.loading.present();
    const payload = {
      client_secret: obj['client_secret'],
      id: obj['id']
    };
    const subs = this.appPostService.confirmPayment(payload).subscribe(res => {
      if (res?.confirm && res.confirm?.status === 'succeeded') {
        this.navigateToSuceess(obj['payment_method'], 'stripe'); //this 1st param need to be replace by transaction id
      }
      this.loading.dismiss();
    }, error => {
      this.loading.dismiss();
      console.error(error);
    });
    this.subscriptions.push(subs);
  }

  public existingCard(paymentOption) {
    let payload = {};
    let userData = JSON.parse(localStorage.getItem('currentUserData'));
    payload['cust_id'] = userData.cust_id;
    payload['card'] = paymentOption;
    payload['cvc'] = this.cvv[paymentOption];
    payload['amount'] = this.paymentData[0];
    const subs = this.appPostService.makePayment(payload).subscribe(res => {
      if (res?.paymentIntent && res.paymentIntent?.status === 'requires_source_action') {
        const url = res['paymentIntent']['next_action']['redirect_to_url']['url'];
        this.openPaymentSecure(url, res['paymentIntent']);
      } else if (res?.paymentIntent && res.paymentIntent?.status === 'succeeded') {
        this.paymentCheckStatus(res['paymentIntent']);
      }
      this.loading.dismiss();
    }, error => {
      this.loading.dismiss();
      console.error(error);
    });
    this.subscriptions.push(subs);
  }

  public newCardayment() {
    let payload = {};
    let userData = JSON.parse(localStorage.getItem('currentUserData'));
    payload['id'] = userData.user_id;
    payload['name'] = this.nameInCard;
    payload['cust_id'] = userData.cust_id;
    payload['number'] = this.cardNumber;
    payload['exp_year'] = this.selectedYear;
    payload['exp_month'] = this.selectedMonth;
    payload['cvc'] = this.cardCvv;
    payload['amount'] = this.paymentData[0];
    const subs = this.appPostService.addNewCardAndMakePayment(payload).subscribe(res => {
      if (res?.paymentIntent && res.paymentIntent?.status === 'succeeded') {
        this.paymentCheckStatus(res['paymentIntent']);
      }
      this.loading.dismiss();
    }, error => {
      this.loading.dismiss();
      console.error(error);
    });
    this.subscriptions.push(subs);
  }

  payWithPaypal() {
    // this.navigateToSuceess('PAY-1AB23456CD789012EF34GHIJ');
    // PayPalEnvironmentProduction: 'YOUR_PRODUCTION_CLIENT_ID',
    this.payPal.init({
      PayPalEnvironmentProduction: '',
      //PayPalEnvironmentSandbox: 'AYS9xxDvHwHzhBYx3hez8khFhYblfWVat_t_5c_JyJstv1kCFFoON3-kAH6M'
      PayPalEnvironmentSandbox: 'AX78MZSmLxkyM0QEgOQLtgbWSKr8s9jlXS2K8MCufNnGTqfRZ78Q_zDwTYcd4ysyY7Dm6gsHib5Ys5HB'
    }).then(() => {
      // Environments: PayPalEnvironmentNoNetwork, PayPalEnvironmentSandbox, PayPalEnvironmentProduction
      this.payPal.prepareToRender('PayPalEnvironmentSandbox', new PayPalConfiguration({
        // Only needed if you get an "Internal Service Error" after PayPal login!
        //payPalShippingAddressOption: 2 // PayPalShippingAddressOptionPayPal
      })).then(() => {
        let payment = new PayPalPayment(this.paymentData[0], this.currency, 'Description', 'sale');
        this.payPal.renderSinglePaymentUI(payment).then((res) => {
          // alert('Payment Successfully paid');
          this.paypalResponse = res;
          this.navigateToSuceess(res.response.id, 'paypal');

          // Successfully paid
          // Example sandbox response
          //
          // {
          //   "client": {
          //     "environment": "sandbox",
          //     "product_name": "PayPal iOS SDK",
          //     "paypal_sdk_version": "2.16.0",
          //     "platform": "iOS"
          //   },
          //   "response_type": "payment",
          //   "response": {
          //     "id": "PAY-1AB23456CD789012EF34GHIJ",
          //     "state": "approved",
          //     "create_time": "2016-10-03T13:33:33Z",
          //     "intent": "sale"
          //   }
          // }
        }, (error) => {
          alert(error);
          // Error or render dialog closed without being successful
        });
      }, () => {
        alert('Config Error');
        // Error in configuration
      });
    }, () => {
      alert('PayPal is not supported or something else');
      // Error in initialization, maybe PayPal isn't supported or something else
    });
  }

  public async navigateToSuceess(tranID, type) {
    this.loading = await this.loadingController.create({
      message: 'Loading please wait',
    });
    this.loading.present();
    const user = JSON.parse(localStorage.getItem('currentUserData'));
    const params = {
      user_id: user['user_id'],
      service_id: user['service_id'],
      location_id: user['location_id'],
      provider_id: this.paymentData[4],
      transaction_id: tranID,
      booking_date: this.paymentData[1],
      start_time: this.paymentData[2],
      end_time: this.paymentData[3],
      booking_status: 'pending',
      total_hrs: this.paymentData[5],
      amount: parseInt(this.paymentData[0]),
      payment_status: 'success',
      payment_method: type
    };
    const subs = this.appPostService.paymentSuccess(params).subscribe(res => {
      if (res?.message) {
        // this.loading.dismiss();
        this.router.navigate(['/payment-success']);
      }
      this.loading.dismiss();
    }, error => {
      this.loading.dismiss();
      console.error(error);
    });
    this.subscriptions.push(subs);
  }



}

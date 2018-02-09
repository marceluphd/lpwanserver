import { EventEmitter } from "events";
import {  checkStatus } from "./helpers";
import dispatcher from "../dispatcher";
import userStore from "./UserStore"
import companyStore from "./CompanyStore"

let rest_url = "http://localhost:3200";


var loginErrorHandler = (error) => {
    console.log("error", error);

    dispatcher.dispatch({
        type: "CREATE_ERROR",
        error: error
    });
};


class SessionStore extends EventEmitter {
    constructor() {
        super();
        this.user = {};
        this.company = {};
        this.applications = [];
        this.settings = {};
        this.token = "";

        this.retrieveMeFromStore();
    }

    getUser() {
        return this.user;
    }

    getCompany() {
        return this.company;
    }

    getSetting(key) {
        return this.settings[key];
    }

    isAdmin() {
        return (this.getUser().role === "admin") || this.isGlobalAdmin();
    }

    isGlobalAdmin() {
        return this.getCompany().type === "admin";
    }

    setToken(token) {
        this.token = token;
    }

    getToken() {
        return this.token;
    }

    logout(){
        this.user = {};
        this.company = {};
        this.applications = [];
        this.settings = {};

        this.clearMeFromStore();

        return;
    }

    getHeader() {
        var token = this.getToken();
        if ( token && ( token !== "") ) {
            return {
                "Authorization": "Bearer " + token,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            }
        }
        else {
            return {}
        }
    }

    //Response { type: "cors", url: "http://localhost:3200/api/sessions", redirected: false, status: 200, ok: true, statusText: "OK", headers: Headers, bodyUsed: true }

    login(login, callbackFunc) {
        var me = this;
        fetch( rest_url + "/api/sessions", {
                method: "POST",
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify( login )
        })
        .then(checkStatus)
        .then((response) => response.text())
        .then((responseData) => {
            this.setToken(responseData);
            me.saveMeToStore();

            userStore.getUserMe( ( u ) => {
                me.user = u;
                me.saveMeToStore();
                companyStore.getCompany( u.companyId ).then( function( c ) {
                    me.company = c;
                    me.saveMeToStore();
                    callbackFunc();
                    me.emit("change");
                })
                .catch( function( err ) {
                    console.log( "Failed to get user's company: " + err );
                });
            });
        })
        .catch(loginErrorHandler);
    }

    saveMeToStore() {
        // Remove anything that's transient, such as event data.
        var me = {};

        if ( this.user ) {
            me.user = this.user;
        }
        if ( this.company ) {
            me.company = this.company;
        }
        if ( this.applications ) {
            me.applications = this.applications;
        }
        if ( this.settings ) {
            me.settings = this.settings;
        }
        if ( this.token ) {
            me.token = this.token;
        }

        sessionStorage.setItem( "user", JSON.stringify( me ) );
    }

    retrieveMeFromStore() {
        var me = sessionStorage.getItem( "user" );
        if ( me ) {
            me = JSON.parse( me );
            if ( me.user ) {
                this.user = me.user;
            }
            if ( me.company ) {
                this.company = me.company;
            }
            if ( me.applications ) {
                this.applications = me.applications;
            }
            if ( me.settings ) {
                this.settings = me.settings;
            }
            if ( me.token ) {
                this.token = me.token;
            }
        }
    }

    clearMeFromStore() {
        sessionStorage.removeItem( "user" );
    }


}


const sessionStore = new SessionStore();

export {rest_url};
export default sessionStore;
import React, {Component} from 'react';
import CompanyStore from "../../../stores/CompanyStore";


// The default company network settings data entry, when the
// specific NetworkType's file is unavailable.
//
// Note that the naming of the component is always:
//    {NetworkType.name}CompanyNetworkSettings
class LoRaCompanyNetworkSettings extends Component {
    constructor( props ) {
        super( props );

        this.state = {
            enabled: false,
            wasEnabled: false,
            value: "",
            original: "",
            rec: null,
        };

        this.getMyLinkRecord( props );

        this.select = this.select.bind(this);
        this.deselect = this.deselect.bind(this);
        this.onTextChange = this.onTextChange.bind(this);
        this.onSubmit = this.onSubmit.bind( this );
        this.isChanged = this.isChanged.bind( this );
        this.isEnabled = this.isEnabled.bind( this );
        this.getMyLinkRecord = this.getMyLinkRecord.bind( this );
    }

    getMyLinkRecord( props ) {
        // Skip trying to load new records
        if ( !props.parentRec ||
             ( !props.parentRec.id ||
               0 === props.parentRec.id ) ) {
            this.setState( { enabled: false } );
            return;
        }

        // Get by companyId and the networkId.
        CompanyStore.getCompanyNetworkType( props.parentRec.id,
                                            props.netRec.id )
        .then( ( rec ) => {
            if ( rec ) {
                // Javascript libraries can get whiny with null.
                if ( !rec.networkSettings ) {
                    rec.networkSettings = undefined;
                }

                // We are saying we're enabled based on the database returned
                // data.  Let the parent know tha they shoud rerender so show
                // that we are not enabled.  We do this from the setState
                // callback to ensure our state is, in fact, properly set.
                this.setState( { enabled: true,
                                 wasEnabled: true,
                                 value: rec.networkSettings.serviceProfile,
                                 original: rec.networkSettings.serviceProfile,
                                 rec: rec }, () => this.props.onChange() );
            }
            else {
                this.setState( { enabled: false, wasEnabled: false } );
            }
        })
        .catch( (err) => {
            console.log( "Failed to get LoRa companyNetworkTypeLink:" + err );
            this.setState( { enabled: false, wasEnabled: false } );
        });
    }

    deselect() {
        let me = this;
        return new Promise( function( resolve, reject ) {
            me.setState( { enabled: false }, () => resolve() );
        });
    }

    select() {
        let me = this;
        return new Promise( function( resolve, reject ) {
            me.setState( { enabled: true }, () => resolve() );
        });
    }

    onTextChange( e ) {
        this.setState( { value: e.target.value })
    }

    // Not an onSubmit for the framework, but called from the parent component
    // when the submit happens.  Do what need to be done for this networkType.
    onSubmit = async function( e ) {
        var ret = this.props.netRec.name + " is unchanged.";
        // Did anything change?
        // Type is enabled...
        if ( this.state.enabled ) {
            // ... but we had no old record: CREATE
            if ( null == this.state.rec ) {
                ret = await CompanyStore.createCompanyNetworkType(
                                this.props.parentRec.id,
                                this.props.netRec.id,
                                { serviceProfile: this.state.value } );
                console.log( "CREATE: ", ret );
            }
            // ...and we had an old record with a data change: UPDATE
            else if ( this.state.value !== this.state.original ) {
                var updRec = {
                    id: this.state.rec.id,
                    networkSettings: { serviceProfile: this.state.value }
                };
                ret = await CompanyStore.updateCompanyNetworkType( updRec );
                console.log( "UPDATE: ", ret );
            }
        }
        // Type is NOT enabled AND we had a record: DELETE
        else if ( null != this.state.rec ) {
            ret = await CompanyStore.deleteCompanyNetworkType( this.state.rec.id );
            console.log( "DELETE: ", ret );
        }

        return ret;
    }

    isChanged() {
        if ( ( this.state.enabled !== this.state.wasEnabled ) ||
             ( this.state.value !== this.state.original ) ) {
                 return true;
        }
        else {
            return false;
        }
    }

    isEnabled() {
        return this.state.enabled;
    }

    render() {
        return (
            <div className={this.state.enabled === true ? "" : "hidden" } >
                No company data can be specified for {this.props.netRec.name} networks.
            </div>
        );
      }
}

export default LoRaCompanyNetworkSettings;
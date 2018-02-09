import React, {Component} from "react";
//import {withRouter} from 'react-router-dom';

//import deviceStore from "../../stores/DeviceStore";
import applicationStore from "../../stores/ApplicationStore";
import companyStore from "../../stores/CompanyStore";
import networkTypeStore from "../../stores/NetworkTypeStore";
import PropTypes from 'prop-types';


class NetworkSpecificUI extends Component {
  static contextTypes = {
    router: PropTypes.object.isRequired
  };

  constructor( props ) {
    super( props );

    // Set up selection UI type based on data type.
    // Using "if" now because it's the on case, may change to "switch" if it
    // gets more complex.
    let selectionType = "checkbox";
    if ( "DeviceProfile" === props.dataName ) {
            selectionType = "radio";
    }

    //props.dataName - "Company", "Application", "DeviceProfile", "Device"
    //props.referenceDataId - id of associated data
    //    Company - not used
    //    Application - companyId
    //    Device - applicationId
    //    DeviceProfile - companyId
    //props.dataRec - Parent record (co, app, dev), or DeviceProfile record

    this.state = {
        selected: "",
        selectionType: selectionType,
        networkTypeRecords: {},
        networkTypeNames: [],
        nameToNetIdMap: {},
        nameToUIMap: {},
    };

    this.subComponents = {};

    this.onChangeInSubcomponent = this.onChangeInSubcomponent.bind( this );
    this.onEnabledCheckboxChange  = this.onEnabledCheckboxChange.bind( this );
    this.isSelected  = this.isSelected.bind( this );
    this.generateNetworksDisplay = this.generateNetworksDisplay.bind( this );
    this.componentWillMount = this.componentWillMount.bind( this );
    this.populateNetworkTypes = this.populateNetworkTypes.bind( this );
    this.onSubmit = this.onSubmit.bind( this );
    this.addNetworkSettingsComponent = this.addNetworkSettingsComponent.bind( this );
  }

  // This component doesn't get an actual "onSubmit" call by the framework,
  // but it is called by the parent component.  Return the logs generated by
  // calling all of the remote networks.
  onSubmit = async function() {
      // Keep track of logging on all of the networks.
      var ret = [];
      // Walk through the subcomponents needing change, and let them change
      // themselves.
      var me = this;
      this.state.networkTypeNames.forEach( async function( name ) {
          var sub = me.subComponents[ name ];
          if ( sub ) {
              try {
                  // Check for a change
                  if ( sub.isChanged() ) {
                      // Sub handles what it needs to do for itself.
                      let log = await sub.onSubmit();
                      ret.push( log );
                  }
              }
              catch( err ) {
                  ret.push( "Remote network update failure on " +
                            name + ": " + err );
              }
          }
      });

      return ret;
  }

  // Called when a radio button or checkbox is clicked to enable/disable
  // the networkType.
  onEnabledCheckboxChange = async function( e ) {
      // Required due to async usage below...
      e.persist();

      // For radio style - we disable any old selection and enable the new.
      if ( this.state.selectionType === "radio" ) {
          if ( this.subComponents[ this.state.selected ] ) {
              await this.subComponents[ this.state.selected ].deselect();
          }
          if ( this.subComponents[ e.target.name  ] ) {
              await this.subComponents[ e.target.name  ].select();
          }
          this.setState( { selected: e.target.name } );
      }
      // For checkbox style (assumed), we just change the isEnabled() value.
      else { //if ( this.state.selectionType === "checkbox" ) {
          if ( this.subComponents[ e.target.name ].isEnabled() ) {
              await this.subComponents[ e.target.name ].deselect();
          }
          else {
              await this.subComponents[ e.target.name ].select();
          }
          // Force a re-render.
          this.setState( { selected: e.target.name } );
      }
  }

  // Called by the checkbox code to see if a networkType is enabled.
  isSelected( name ) {
      // For radio style - we keep track locally what's selected so it's
      // easy to show in the UI.
      if ( this.state.selectionType === "radio" ) {
          return name === this.state.selected;
      }
      // For checkbox style (assumed), we ask the component, rather than
      // keeping the state here and in the subcomponent.
      else { //if ( this.state.selectionType === "checkbox" ) {
          if ( this.subComponents[ name  ] ) {
              return this.subComponents[ name  ].isEnabled();
          }
          // Subcomponent not yet set up...
          else {
              return false;
          }
      }
  }

  // Sets up the valid network types:
  // - loads default UI
  // - Sets up name to id map for networkTypes
  // - Sets up name to UI code map for networkTypes and data.  (Uses default
  //   if no networkType-specific code.)
  // - Sets up the list of known networks
  populateNetworkTypes = async function( nts ) {
      var ntn = [];
      var nameToUIMap = {};
      var nameToNetIdMap = {};
      var networkTypeRecords = {};

      // Set up the default data handler for the data type.
      var def;
      try {
          def = await import(`../NetworkCustomizations/default/${this.props.dataName}` );
      }
      catch( err ) {
          // Not ready yet - type is still likely unset.
          console.log( "No default NetworkType handler available for " +
                       this.props.dataName );
      }

      // For each valid networkType...
      var me = this;
      let tracker = {};
      await nts.forEach( async function( nt ) {
          // Don't double-load a network type
          if ( !tracker[ nt.name ] ) {
              tracker[ nt.name ] = true;
              // cache the networkType record for the subcomponents
              networkTypeRecords[ nt.name ] = nt;
              // Map name to the networkTypeIdprops.dataName
              nameToNetIdMap[ nt.name ] = nt.id;
              // Map names to the UI code to use.  Map unknown names to
              // the default UI.
              try {
                  var module = await import(`../NetworkCustomizations/${nt.name}/${me.props.dataName}` );
                  nameToUIMap[ nt.name ] = module.default;
              }
              catch( err ) {
                  console.log( "Error loading NetworkType-specific code for " + nt.name + ":" + err );
                  console.log( "Using default UI" );
                  // No file?  Use default.
                  nameToUIMap[ nt.name ] = def.default;
              }
              // Keep track of known networks.
              ntn.push( nt.name );
              me.setState( { networkTypeRecords: networkTypeRecords,
                             networkTypeNames: ntn,
                             nameToUIMap: nameToUIMap,
                             nameToNetIdMap: nameToNetIdMap } );
          }
      });
  }

  // Called by framework before the UI displays.
  async componentWillMount() {
      // We need to know about all available networkTypes for this data type.
      switch ( this.props.dataName ) {
        case "Company":
            // Companies show all networkTypes possible
            let nts = await networkTypeStore.getNetworkTypes(); this.populateNetworkTypes( nts );
            break;
        case "Application":
        case "DeviceProfile":
            // Applications and Device Profiles show all networkTypes enabled
            // to their company.
            let cnts = await companyStore.getAllCompanyNetworkTypes( this.props.referenceDataId );

            // Get the networkTypeRecords.
            nts = [];
            for( let i = 0; i < cnts.length; ++i ) {
                let nt = await networkTypeStore.getNetworkType( cnts[ i ].networkTypeId );
                nts.push( nt );
            }
            this.populateNetworkTypes( nts );
            break;
        case "Device":
            // Devices show all networkTypes enabled to their application
            let ants = await applicationStore.getAllApplicationNetworkTypes( this.props.referenceDataId );

            // Get the networkTypeRecords.
            nts = [];
            for( let i = 0; i < ants.length; ++i ) {
                let nt = await networkTypeStore.getNetworkType( ants[ i ].networkTypeId );
                nts.push( nt );
            }
            this.populateNetworkTypes( nts );
            break;
        default:
            // Ignore for now.
            console.log( "Invalid props dataName = " + this.props.dataName );
            break;
      }

  }

  // We get this callback when a subcomponent is rendered so we can keep track
  // of the allocated object.
  addNetworkSettingsComponent( name, comp ) {
      // For some silly reason, the components all call back with null, and
      // then with the component.  If you look at the bugs, it's there, but the
      // devs act like it's perfectly reasonable to do that.  So it's better to
      // have EVERY app out there check for null and ignore rather than doing it
      // in the calling code.  Ugh.
      if ( null != comp ) {
          this.subComponents[ name ] = comp;
      }
  }

  // Subcomponents sometimes load data, but it gets done after this parent
  // renders.  This tells this parent to rerender.
  onChangeInSubcomponent( name ) {
      // Just force the rerender.
      this.setState( { selected: name } );
  }

  // Called to render the custom UIs for all of the valid networkTypes
  generateNetworksDisplay() {
      var me = this;
      var networkUIs = [];
      for ( var i = 0; i < this.state.networkTypeNames.length; ++i ) {
          var CustomUI = this.state.nameToUIMap[ this.state.networkTypeNames[ i ] ];
          var name = this.state.networkTypeNames[ i ];
          var netId = this.state.nameToNetIdMap[ name ];
          var create = this.props.dataRec &&
                       ( !this.props.dataRec.id ||
                       ( this.props.dataRec.id === 0 ) );

          // eslint-disable-next-line below is required to block warning on the
          // ref function in a loop.  Error is "don't define a function in a
          // loop".  Sorry, that's how refs work.
          networkUIs.push(
              <tr key={name}>
                  <td>{name}</td>
                  <td>
                      <input className="form-check-input"
                             name={name}
                             type={this.state.selectionType}
                             value={this.isSelected( name )}
                             checked={this.isSelected( name )}
                             onChange={this.onEnabledCheckboxChange} />
                  </td>
                  <td>
                      <CustomUI
                          ref={ // eslint-disable-next-line
                              (thisComponent) => {
                                  me.addNetworkSettingsComponent( name, thisComponent ); } }
                          key={netId}
                          parentRec={me.props.dataRec}
                          referenceDataId={me.props.referenceDataId}
                          netRec={me.state.networkTypeRecords[ name ]}
                          create={create}
                          onChange={this.onChangeInSubcomponent}
                      />
                  </td>
              </tr>
            );
      }
      return ( networkUIs );
  }

  render() {

    return (
        <div>

          <table className="table table-hover">
            <thead>
                <tr>
                  <th className="col-md-2">Network Type</th>
                  <th className="col-md-1">Enabled?</th>
                  <th className="col-md-10">Custom Data</th>
                </tr>
            </thead>
            <tbody>
                { this.generateNetworksDisplay() }
            </tbody>
          </table>
        </div>
    );
  }

}

//export default withRouter(NetworkTypeLinks);
export default NetworkSpecificUI;
# LPWAN Server (lpwanserver)

This is the CableLabs' LPWAN Server project.  It is a React UI that uses 
a Node.js REST server to manage companies' LPWAN Applications and Devices
on various network servers of various types (LoRa, NB-IoT, etc.).  It 
collects the data generated by the devices, and forwards that data to a
server for the application.

### Install Dependencies
Add additional dependencies in **package.json** and **ui/package.json**.

`npm install`


### Usage
To start the REST server:
`node bin/rest`

 To start the UI server:
 `cd ui`
 `npm start`


const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'ICafe Monitoring Agent',
  description: 'Internet Cafe Client Agent. Runs invisibly in the background to report PC status.',
  script: path.join(__dirname, 'agent.js'),
  env: [{
    name: "NODE_ENV",
    value: "production"
  }]
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install', function() {
  console.log('Service installed successfully!');
  console.log('Starting service (this will run secretly in the background)...');
  svc.start();
});

// Listen for the "alreadyinstalled" event
svc.on('alreadyinstalled', function() {
  console.log('The service is already installed.');
});

// Install the script as a service
svc.install();

# NordDNS
> NordDNS encrypts your DNS traffic and hides your IP and physical location. Works on any devices at once, on every major platform.


## Prerequisites
- Kubernetes
- Helm

## Installation
### Installation of OpenWhisk
- Create the openwhisk namespace
```bash
kubectl create namespace openwhisk
```

- Deploy OpenWhisk
```bash
helm install owdev .\openwhisk -n openwhisk -f mycluster.yaml
```

Upgrade OpenWhisk
```bash
helm upgrade owdev .\openwhisk -n openwhisk -f mycluster.yaml
```

- Connect OpenWhisk CLI to this deployment
```bash 
wsk property set --apihost localhost:31001
wsk property set --auth 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP
```

- Test Deployment
```bash
helm test owdev -n openwhisk
```

- Launch sample function (Greeting)
```bash
wsk action create greeting .\samples\greeting.js -i
wsk action invoke greeting --result -i
```

- Cleanup
```bash
helm uninstall owdev -n openwhisk
```

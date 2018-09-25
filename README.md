# Installation instructions
#### Install WGCNA package in R:  
`source("http://bioconductor.org/biocLite.R")`  
`biocLite(c("AnnotationDbi", "impute", "GO.db", "preprocessCore"))`  
`install.packages("WGCNA")`  

#### Clone git
`git clone https://github.com/LUMC-BioSemantics/crosslinkWGCNA.git`

#### In wgcna folder:
Checkout developtment branch: `git checkout layout`

#### In www folder:
Install npm if it is not installed.

Install required packages:
`npm install`

Run the development web server:
`npm run dev`

#### In api folder:
Set location of flask application:
`export FLASK_APP=app/__init__.py`  
Install dependencies:  
`pip install Flask-Session`  
`pip install flask-cors --upgrade`  
`sudo apt-get install python-scipy`  
`pip install redis`  
`pip install pandas`  
`pip install rpy2==2.8.6`  
`sudo apt-get install redis-server`  
Make sure that redis-server is running  

Run flask application:  
`flask run`

If errors: install any missing dependencies that are causing these errors.

#### Prepare data folder:
Create the data folder:
`mkdir /opt/wgcna`

set write permission for user:
`sudo chown -R user:user /opt/wgcna`  
For help on chown, see for example: https://askubuntu.com/questions/49184/sudo-chown-r-rootmyusername-var-lib-php-session-what-should-i-put-in-usernam


#### Open webtool:
open `localhost:4000` in google chrome.

# Run instructions:
#### In www folder:
`npm run dev`

#### In api folder:
`export FLASK_APP=app/__init__.py`

`flask run`

#### Open webtool:
open `localhost:4000` in google chrome.

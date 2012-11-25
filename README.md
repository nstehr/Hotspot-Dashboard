# HotSpot Dashboard
===========

Web based dashboard highlighting the predicted 'hotspots' in a given project.  A hotspot is a specific piece of code that has proven to cause problems to 
the developers on the project.  

The hotspot calculation is based on the algorithm outlined: http://google-engtools.blogspot.ca/2011/12/bug-prediction-at-google.html.

## Installation

The backend hotspot calculator and server are written in python, so a python environment is required.  Also, the following libraries are needed:

* bottle
* sqlalchemy
* subvertpy
* suds

The appropriate values need to be specified in settings.py.  **username** and **password** are the username and password for the SVN repository, and the 
jira value is the url to your jira installations SOAP web service root.

## Note

The backend hotspot calculator works by expecting the jira number of a given issue to be specified somewhere in the SVN commit message.

## Author

Nathan Stehr - [laserdeathstehr.com](http://laserdeathstehr.com)

## Thanks

I was able to work on a solid chunk of this project (mainly the frontend visualizations and the multi-project functionality) on CreativiDay time 
provided by my employer, Macadamian Technologies.
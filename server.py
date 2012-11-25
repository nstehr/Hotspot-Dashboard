import json
import time
import os
from bottle import route,run,request,response,install,uninstall,static_file,view,post
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from datetime import date,datetime
from bug_predictor import calculate_hot_spots
from models import Project

MOCK = False
STATIC_ROOT = '%s/static' % (os.getcwd())
CACHE_INTERVAL = 24 * 60 * 60
cache_update_time = time.time() + CACHE_INTERVAL
db = create_engine('sqlite:///projects.db')

def json_result(f):
    def g(*a, **k):
        return json.dumps(f(*a, **k))
    return g

static_hotspots = ""


@route('/hotspots')
@json_result
def hotspots():
    global cache_update_time
    
    if MOCK:
	    return static_hotspots
    
    end_time = request.query.endDate
    project = loadProject(request.query.project)
    
    
    if len(end_time) <= 0:
        end_time = time.time()
    else:
        end_time = time.mktime(time.strptime(end_time, "%m/%d/%Y"))
       
    
    hotspot_tuples = calculate_hot_spots(project.jiraKey,project.repoUrl,end_time=end_time,cache_update_time=cache_update_time)
    #update the cache time if necessary
    if(time.time() > cache_update_time):
        cache_update_time = time.time() + CACHE_INTERVAL
    hotspots = []
    for hs_tuple in hotspot_tuples:
	    hotspot = {}
	    hotspot['filename'] = hs_tuple[0]
	    hotspot['score'] = hs_tuple[1]
	    hotspot['authors'] = hs_tuple[2]
	    hotspots.append(hotspot)
    return hotspots

@route('/projects')
def getProjects():
    Session = sessionmaker(bind=db)
    session = Session()
    projects = session.query(Project).order_by(Project.id)
    projectList = []
    for project in projects:
	    projectList.append(project.as_dict())
    return json.dumps(projectList)
    
@post('/project')
def createProject():
    name = request.forms.get('projectName')
    jiraKey = request.forms.get('jiraKey')
    repoUrl = request.forms.get('repoUrl')
    
    project = Project(name,jiraKey,repoUrl)
    Session = sessionmaker(bind=db)
    session = Session()
    session.add(project)
    session.commit()

    projectDetails = {'name':project.name,'id':project.id}
    return projectDetails

@route('/static/<filepath:path>')
def static(filepath):
    return static_file(filepath,root=STATIC_ROOT)

def loadProject(id):
    Session = sessionmaker(bind=db)
    session = Session()
    project = session.query(Project).filter_by(id=id).first()
    return project

run(host='localhost', port=(9090))
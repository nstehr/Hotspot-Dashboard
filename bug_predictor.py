from suds.client import Client
from subvertpy import client
from subvertpy import delta
from subvertpy import properties
from subvertpy import ra
import subvertpy
import dateutil.parser
import time
import math
import operator
import settings
from datetime import date,datetime
from collections import Counter
import os.path

#implementation of: http://google-engtools.blogspot.ca/2011/12/bug-prediction-at-google.html


ignorableExtensions = ['txt','doc','docx','css','html','jar','jsp','properties','png']

client = Client(settings.jira)
ONE_DAY_IN_SECONDS = 24 * 60 * 60

bugCache = {}
svnCache = {}

def getpass(realm, username, may_save):
    return self.username or username, self.password or '', False
def getuser(realm, may_save):
    return self.username or '', False
    
def get_token():
#auth. token for making API calls
    token = client.service.login(settings.username, settings.password)
    return token
    
def get_bugs(project):
    token = get_token()
    query = 'project="%s" and type = Bug and (status = Closed or status = Resolved or status = Verified)' % (project)
    results = client.service.getIssuesFromJqlSearch(token,query,2000)
    bugs = []
    for result in results:
        bugs.append(result.key)
    return bugs

def fixed_bug(log,bugs):
    for bug in bugs:
        #relies on the fact that our convention dictates jira number in commit message
        if bug in log:
            return True
    return False

def is_source_file(filename):
    extension = os.path.splitext(filename)[1][1:]
    return extension not in ignorableExtensions and "/test" not in filename
	
def calculate_hot_spots(jiraKey,repoUrl,end_time = time.time(),cache_update_time = time.time()):
    providers = ra.get_platform_specific_client_providers()
    providers += [
            ra.get_simple_provider(),
            ra.get_username_provider(),
            ra.get_ssl_client_cert_file_provider(),
            ra.get_ssl_client_cert_pw_file_provider(),
            ra.get_ssl_server_trust_file_provider(),
            ra.get_username_prompt_provider(getuser, 0),
            ra.get_simple_prompt_provider(getpass, 0),
        ]
    
    auth=ra.Auth(providers)
    auth.set_parameter(subvertpy.AUTH_PARAM_DEFAULT_USERNAME, settings.username) 
    auth.set_parameter(subvertpy.AUTH_PARAM_DEFAULT_PASSWORD, settings.password)

    conn = ra.RemoteAccess(repoUrl,auth=auth)

    global bugCache
    global svnCache
    
    if jiraKey in bugCache:
        bugs = bugCache[jiraKey]
    else:
        bugs = []
    if jiraKey in svnCache:
        svn_entries = svnCache[jiraKey]
    else:
        svn_entries = []
    
    
    
    start_time = end_time
    scores = {}
    authors = {}
    modified_files = []
    
    if (len(bugs) == 0 and len(svn_entries) == 0) or time.time() > cache_update_time:
        #retrieve the SVN log entries
        for (changed_paths, rev, revprops, has_children) in conn.iter_log(paths=None,start=0, end=conn.get_latest_revnum(), discover_changed_paths=True):
            svn_entries.append((changed_paths, rev, revprops, has_children))
        #query jira for all the closed bugs
        bugs = get_bugs(jiraKey)
        #add to the cache dictionary
        bugCache[jiraKey] = bugs
        svnCache[jiraKey] = svn_entries
    
    for (changed_paths, rev, revprops, has_children) in svn_entries:
        commit_time = time.mktime(dateutil.parser.parse(revprops["svn:date"]).timetuple())
        if commit_time <= end_time:
            #this svn commit contains code that fixed a bug
            if fixed_bug(revprops["svn:log"].decode('utf8') ,bugs):
	            #only consider *.java and *.js files for now
                modified_files.extend([(commit_time,filename,revprops["svn:author"]) for filename in changed_paths.keys() if is_source_file(filename)])
            if commit_time < start_time:
                start_time = commit_time
    
    for modified_file in modified_files:
        filename = modified_file[1]
        author = modified_file[2]
        #as per Google's description, normalize t between 0 and 1
        t = (modified_file[0]-start_time)/(end_time-start_time)
        #google's magic sauce
        score = 1/(1+(math.e**(-12*t+12)))
        #map the score to the file
        if filename not in scores:
            scores[filename] = score
        else:
            scores[filename] = scores[filename] + score
        #map the author(s) to the file
        if filename not in authors:
           authors[filename] = [author]
        else:
           authors[filename].append(author)

    #convert the list of authors to a map containing the counts 
    for filename,authorsList in authors.items():
        authors[filename]=Counter(authorsList)
    
    
    sorted_scores = sorted(scores.iteritems(), key=operator.itemgetter(1))
    sorted_scores.reverse()
    
    #add the author count to the scores tuple
    scoresWithAuthors =[]
    for score in sorted_scores:
        scoresWithAuthors.append((score[0],score[1],authors[score[0]]))
    
    #return the top 10 hotspots
    return scoresWithAuthors[:10]
    
#main function for testing/commandline use
if __name__ == "__main__":
    end_time = time.mktime(datetime(2012,04,20).timetuple())
    sorted_scores = calculate_hot_spots()
    print "Score\t\tFile"
    for hotspot in sorted_scores[:10]:
        print "%f\t%s\t%s" % (hotspot[1],hotspot[0],hotspot[2])    


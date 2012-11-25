from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import *

Base = declarative_base()

class Project(Base):
    __tablename__ = 'project'
    
    id = Column(Integer, primary_key=True)
    name = Column(String)
    jiraKey = Column(String)
    repoUrl = Column(String)
    
    def __init__(self,name,jiraKey,repoUrl):
        self.name = name
        self.jiraKey = jiraKey
        self.repoUrl = repoUrl

    def as_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}
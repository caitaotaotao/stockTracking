from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine import create_engine
from sqlalchemy.orm import declarative_base

engine = create_engine(
    'postgresql+psycopg2://postgres:941010@localhost:5432/quant_analysis',
    echo=False, pool_size=20,
    connect_args={'client_encoding': 'utf8', 'options': '-csearch_path=quant_research'},
    isolation_level='AUTOCOMMIT',
    pool_pre_ping=True, pool_recycle=3600
)
Session = sessionmaker(bind=engine)
Base = declarative_base()

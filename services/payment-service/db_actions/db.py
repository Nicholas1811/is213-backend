import os
from sqlalchemy import URL, create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Mapped, mapped_column

DB_HOST = os.getenv("PAYMENT_DB_HOST", "esd-database.cdoocqmu8ddi.ap-southeast-2.rds.amazonaws.com")
DB_PORT = os.getenv("PAYMENT_DB_PORT", "5432")
DB_NAME = os.getenv("PAYMENT_DB_NAME", "postgres")
DB_USER = os.getenv("PAYMENT_DB_USER")
DB_PASSWORD = os.getenv("PAYMENT_DB_PASSWORD")

db_url = URL.create(
    drivername="postgresql", # Notice we drop the 'jdbc:' here
    username=DB_USER,
    password=DB_PASSWORD,
    host=DB_HOST,
    port=DB_PORT,
    database=DB_NAME
)

engine = create_engine(db_url)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass


# Temporary test to verify connection
if __name__ == "__main__":
    try:
        with engine.connect() as connection:
            print("✅ Successfully connected to AWS RDS!")
    except Exception as e:
        print(f"Connection failed: {e}")
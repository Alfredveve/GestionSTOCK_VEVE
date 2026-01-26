import psycopg2

def list_db_info():
    try:
        conn = psycopg2.connect(
            dbname='postgres',
            user='postgres',
            password='veve',
            host='localhost',
            port='5432'
        )
        conn.autocommit = True
        cur = conn.cursor()
        
        # List databases
        cur.execute("SELECT datname FROM pg_database;")
        databases = cur.fetchall()
        print("Bases de données trouvées :")
        for db in databases:
            print(f"- {db[0]}")
            
        # Connect to pgstock and list tables
        if ('pgstock',) in databases:
            print("\nConnexion à 'pgstock'...")
            conn2 = psycopg2.connect(
                dbname='pgstock',
                user='postgres',
                password='veve',
                host='localhost',
                port='5432'
            )
            cur2 = conn2.cursor()
            cur2.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
            tables = cur2.fetchall()
            print(f"Tables trouvées dans 'pgstock' ({len(tables)}) :")
            # Just show first 5 for brevity
            for t in tables[:5]:
                print(f"- {t[0]}")
            if len(tables) > 5:
                print("...")
            cur2.close()
            conn2.close()
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Erreur : {e}")

if __name__ == "__main__":
    list_db_info()

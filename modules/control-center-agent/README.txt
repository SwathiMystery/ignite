Ignite Web Agent
======================================
Ignite Web Agent is a java standalone application that allow to connect Ignite Grid to Ignite Web Agent.
Ignite Web Agent communicates with grid nodes via REST interface and connects to Ignite Web Agent via web-socket.

Two main functions of Ignite Web Agent:
 1. Proxy between Ignite Web Agent and Ignite Grid to execute SQL statements and collect metrics for monitoring.
    You may need to specify URI for connect to Ignite REST server via "-n" option.

 2. Proxy between Ignite Web Agent and user RDBMS to collect database metadata for later CacheTypeMetadata configuration.
    You may need to copy JDBC driver into "./jdbc-drivers" subfolder or specify path via "-drv" option.

Usage example:
    ignite-control-center-agent.sh -l john.smith@gmail.com -p qwerty -s wss://control-center.example.com

Configuration file:
    Should be a file with simple line-oriented format as described here: http://docs.oracle.com/javase/7/docs/api/java/util/Properties.html#load(java.io.Reader)

    Available entries names:
        login
        password
        serverURI
        nodeURI
        driverFolder
        test-drive-metadata
        test-drive-sql

    Example configuration file:
        login=john.smith@gmail.com
        serverURI=wss://control-center.example.com:3001

Options:
    -h, --help
       Print this help message.

    -c, --config
       Path to optional configuration file.

    -drv, --driver-folder
       Path to folder with JDBC drivers, for example "/home/user/drivers".
       Default: "./jdbc-drivers".

    -l, --login
       User's login (email) on Ignite Web Agent.

    -n, --node-uri
       URI for connect to Ignite REST server, for example: "http://localhost:8080".
       Default: "http://localhost:8080".

    -p, --password
       User's password.

    -s, --server-uri
       URI for connect to Ignite Web Agent, for example: "wss://control-center.example.com:3001".
       Default: "wss://localhost:3001".

    -tm, --test-drive-metadata
       Start H2 database with sample tables in same process.
       JDBC URL for connect to sample database: jdbc:h2:mem:test-drive-db

    -ts, --test-drive-sql
       Create cache and populate it with sample data for use in query.


Ignite Web Agent Build Instructions
==============================================
If you want to build from sources run following command in Ignite project root folder:
    mvn clean package -pl :ignite-control-center-agent -am -P control-center -DskipTests=true

FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /app

# Copy pom.xml
COPY pom.xml .

# Download dependencies
RUN mvn dependency:go-offline

# Copy source code
COPY src ./src

# Build
RUN mvn clean package -DskipTests

# Final stage
FROM eclipse-temurin:17-jre

WORKDIR /app

# Copy jar from builder
COPY --from=builder /app/target/*.jar app.jar

# Run
CMD ["java", "-jar", "app.jar"]

# Made with Bob

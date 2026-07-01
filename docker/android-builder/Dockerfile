# ============================================================
# AppForge Android Builder Docker Image
# Includes: OpenJDK 17, Android SDK, Gradle 8.x
# ============================================================

FROM ubuntu:22.04

LABEL maintainer="AppForge <hello@appforge.dev>"
LABEL description="Android build environment for AppForge"

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Java
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH=$JAVA_HOME/bin:$PATH

# Android SDK
ENV ANDROID_HOME=/opt/android-sdk
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-17-jdk-headless \
    wget \
    unzip \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Android command-line tools
RUN mkdir -p $ANDROID_HOME/cmdline-tools && \
    cd $ANDROID_HOME/cmdline-tools && \
    wget -q "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip" -O tools.zip && \
    unzip -q tools.zip && \
    mv cmdline-tools latest && \
    rm tools.zip

# Install Gradle 8.5
ENV GRADLE_VERSION=8.5
RUN wget -q https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip -O gradle.zip && \
    unzip -q gradle.zip -d /opt && \
    rm gradle.zip
ENV GRADLE_HOME=/opt/gradle-${GRADLE_VERSION}
ENV PATH=$GRADLE_HOME/bin:$PATH

# Accept licenses and install SDK components
RUN yes | sdkmanager --licenses > /dev/null 2>&1 && \
    sdkmanager --update && \
    sdkmanager \
    "platform-tools" \
    "platforms;android-34" \
    "build-tools;34.0.0" \
    "extras;android;m2repository" \
    "extras;google;m2repository"

# Create non-root user for security
RUN groupadd -r builder && useradd -r -g builder -m builder
RUN chown -R builder:builder $ANDROID_HOME && chown -R builder:builder $GRADLE_HOME

# Set working directory
WORKDIR /workspace

# Switch to non-root user
USER builder

# Default command (can be overridden)
CMD ["gradle", "assembleRelease", "--no-daemon"]

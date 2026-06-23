# ====================================
# Dockerfile - Google Cloud Run
# ====================================

# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY BookSearchApp.csproj ./
RUN dotnet restore

COPY . .
RUN dotnet publish -c Release -o /app/publish

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080

# Cloud Run يحدد متغير PORT وقت التشغيل (لا وقت البناء)، لذلك نستخدم صيغة shell
# حتى يُقرأ $PORT فعلياً عند تشغيل الحاوية، مع قيمة افتراضية 8080 إن لم يكن موجوداً.
ENTRYPOINT ["sh", "-c", "ASPNETCORE_URLS=http://+:${PORT:-8080} dotnet BookSearchApp.dll"]


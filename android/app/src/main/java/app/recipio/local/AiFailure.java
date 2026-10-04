package app.recipio.local;
final class AiFailure extends Exception {
    final String code;final int httpStatus;final String providerCode;
    AiFailure(String code){this(code,0,null);}
    AiFailure(String code,int status,String providerCode){super(code);this.code=code;this.httpStatus=status;this.providerCode=providerCode;}
}
